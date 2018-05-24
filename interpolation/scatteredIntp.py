import matplotlib
import numpy as np
import matplotlib.pyplot as plt
import scipy.linalg
import math
from sklearn.neighbors import KDTree
from PIL import Image


class Point:
    def __init__(self, coords, d):
        self.x = coords[0]
        self.y = coords[1]
        self.z = coords[2]
        self.d = d

class ScatteredDataIntrp:
    def __init__(self, filename, dim_x, dim_y, dim_z, dtype):
        self.filename = filename
        self.dim_x = dim_x
        self.dim_y = dim_y
        self.dim_z = dim_z
        self.dtype = dtype


    def readVolume(self):
        self.vol = np.fromfile(self.filename, dtype=self.dtype)
        self.vol.shape = (self.dim_x, self.dim_y, self.dim_y)

    def scatteredVolume(self, nop, option='shepard_local'):
        ret = []
        self.nop = nop
        random_coords = np.random.randint(64, size=(nop, 3))
        self.random_Points = [ Point(p, self.vol[tuple(p)]) for p in random_coords ]
        # for i in range(0, self.nop):
        #     print(self.random_Points[i].x, self.random_Points[i].y, self.random_Points[i].z, self.random_Points[i].d)
        self.random_vals = [ tuple(p) for p in random_coords ] 
        self.kdt = KDTree(self.random_vals, leaf_size=30, metric="euclidean")
        self.new_vol = np.zeros((self.dim_x, self.dim_y, self.dim_z))

        if option == 'shepard_local':
            return self.shepard_local(10)
        elif option == 'shepard_global':
            return self.shepard_global()
        elif option == 'hardy_local':
            return self.hardy_local(0, 0.5, 10)
        elif option == 'hardy_global':
            return self.hardy_global(0, 0.5)
            
            
    def shepard_local(self, k):
        ret = np.zeros((self.dim_x, self.dim_y, self.dim_z))
        tmp = 0

        for i in range(0, self.nop):
            ret[self.random_Points[i].x, self.random_Points[i].y, self.random_Points[i].z] = self.random_Points[i].d;
        
        for point in np.ndindex(self.dim_x, self.dim_y, self.dim_z):
            dist, inds = self.kdt.query([point], k)
            vals = np.array( [self.random_Points[i] for i in inds[0]] )
            numerator = 0.0
            denominator = 0.0
            for val in vals:
                distance = (np.square(point[0] - val.x) + np.square(point[1] - val.y) + np.square(point[2] - val.z));
                numerator += val.d*1/distance
                denominator += 1/distance
            if denominator != 0.0:
                ret[point[0]][point[1]][point[2]]  = numerator/denominator
            else:
                ret[point[0]][point[1]][point[2]] = numerator/1.0
        return ret
            
                
    def shepard_global(self):
        ret = np.zeros((self.dim_x, self.dim_y, self.dim_z))
        tmp = 0

        for i in range(0, self.nop):
            ret[self.random_Points[i].x, self.random_Points[i].y, self.random_Points[i].z] = self.random_Points[i].d;

        numerator = 0.0
        denominator = 0.0
            
        for point in np.ndindex(self.dim_x, self.dim_y, self.dim_z):
            distance = 1.0/(np.square(point[0] - self.random_Points[point[0]].x) + np.square(point[1] - self.random_Points[point[1]].y) + np.square(point[2] - self.random_Points[point[2]].z));
            numerator += self.random_Points[point[0]].d*distance
            denominator += distance
            if denominator != 0.0:
                ret[point[0]][point[1]][point[2]]  = numerator/denominator
            else:
                ret[point[0]][point[1]][point[2]] = numerator/1.0
        return ret
    
    def distance(self, X, Y):
        return math.sqrt((X.x - Y.x)**2 + (X.y - Y.y)**2 + (X.z - Y.z)**2)

    def distance2(self, X, Y):
        return math.sqrt((X.x -Y[0])**2 + (X.y - Y[1])**2 + (X.z - Y[2])**2)

    def distance3(self, X, Y):
        return math.sqrt((X[0] - Y[0])**2 + (X[1] - Y[1])**2 + (X[2] - Y[2])**2)
    
    def C(self, R, distances):
        b = []
        if len(distances) == 0:
            for i in range(0, self.nop):
                b.append(self.random_Points[i].d)
        else:
            for i in range(0, len(distances)):
                b.append(distances[i].d)

        print 'b'
        A = np.zeros((self.nop, self.nop))
        for i in range(0, self.nop):
            x = self.random_Points[i]
            for j in range(0, self.nop):
                y = self.random_Points[j]
                A[i][j] = math.sqrt(R + self.distance(x,y))
        print 'c'
        At = A.transpose()
        x = np.linalg.solve(np.dot(At, A), np.dot(At,b))
        return x
                
    def hardy_global(self, R, power):
        ret = np.zeros((self.dim_x, self.dim_y, self.dim_z))
        c = self.C(R, [])

        for i in range(0, self.nop):
            ret[self.random_Points[i].x, self.random_Points[i].y, self.random_Points[i].z] = self.random_Points[i].d;

        for point in np.ndindex(self.dim_x, self.dim_y, self.dim_z):
            if self.vol[point[0], point[1], point[2]] != 0:
                continue
            for i in range(0, self.nop):
                val = R + self.distance2(self.random_Points[i], point)
                ret[point[0]][point[1]][point[2]] = c[i]*math.pow(val, power)
        return ret


    def hardy_local(self, R, power, k):
        ret = np.zeros((self.dim_x, self.dim_y, self.dim_z))

        for i in range(0, self.nop):
            ret[self.random_Points[i].x, self.random_Points[i].y, self.random_Points[i].z] = self.random_Points[i].d;
        count = 0
        for point in np.ndindex(self.dim_x, self.dim_y, self.dim_z):
            dist, inds = self.kdt.query([point], k)
            vals = np.array( [self.random_Points[i] for i in inds[0]] )
            c = self.C(R, vals)
            
            print count
            for i in range(0, len(vals)):
                val = R + self.distance2(vals[i], point)
                ret[point[0]][point[1]][point[2]] = c[i]*math.pow(val, power)
            count = count + 1
        return ret
        
    def writeSlices(self, foldername, vol):
        for i in range(0, 64):
            vol_dir = vol[i,:,:]
            plt.imshow(vol_dir, cmap="gray")
            plt.savefig('./'+foldername+'x'+str(i))

    def writeRaw(self, filename, vol):
        f = open(filename+'.raw', 'w')
        for i in range(0, self.dim_x):
            for j in range(0, self.dim_y):
                for k in range(0, self.dim_z):
                    f.write(vol[i][j][k])
        f.close()
        
    def writeImage(self, filename):
        ret = []
        idx = [34, 35]
        for id in range(0, len(idx)):
            img = Image.open("shepard_local_x/shepard_localx"+str(idx[id])+".png")
            sizep = img.size

            pixel_values = list(img.getdata())

            for i in range(0, 800):
                for j in range(0, 600):
                    ret.append(pixel_values[i*sizep[1]+j])

        ans = np.asarray(ret)
        ans.resize((800, 1200, 4))

        plt.axis('off')
        plt.imshow(ans, cmap="gray")
        plt.show()
        plt.savefig('b.png')
        res = Image.fromarray(np.asarray(ret).astype(np.float32)).convert('RGB')
        print type(res)
        res.save('a.png')
        img2 = Image.open('a.png')
        print img2.size

    def combineSlices(self, foldername):
        ret = np.zeros((self.dim_x, self.dim_y, self.dim_z))
        for filename in os.listdir(foldername):
            print filename
        plt.imshow(ret, cmap="gray")
#        plt.savefig('./')

    
if __name__ == "__main__":
    sc = ScatteredDataIntrp('../fuel_8_64.raw', 64, 64, 64, np.uint8)
    # #sc = ScatteredDataIntrp('../foot_8_256.raw', 256, 256, 256, np.uint8)
    # sc.readVolume()
    # vol = sc.scatteredVolume(10, 'hardy_local')
    # #    sc.scatteredVolume(5000, 'shepard_local')
    sc.writeImage('hardy_local')
